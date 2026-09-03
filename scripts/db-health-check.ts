import "dotenv/config";
import { prisma } from "c:/jogjadoelan/lib/db";

interface VariableRow {
  Variable_name: string;
  Value: string;
}

interface TableCount {
  name: string;
  count: number;
}

async function runHealthCheck() {
  console.log("\n=======================================================");
  console.log("       JOGJADOELAN DATABASE HEALTH & METRICS           ");
  console.log("=======================================================");

  const startPing = Date.now();
  try {
    // 1. Ping test
    await prisma.$queryRaw`SELECT 1 as ping`;
    const pingMs = Date.now() - startPing;

    // 2. Fetch server variables
    const variables = await prisma.$queryRaw<VariableRow[]>`
      SHOW VARIABLES WHERE Variable_name IN ('max_connections', 'wait_timeout', 'interactive_timeout', 'innodb_buffer_pool_size', 'version')
    `;
    const varMap = new Map(variables.map((v) => [v.Variable_name, v.Value]));

    // 3. Fetch server status metrics
    const statusRows = await prisma.$queryRaw<VariableRow[]>`
      SHOW STATUS WHERE Variable_name IN ('Threads_connected', 'Threads_running', 'Slow_queries', 'Uptime', 'Questions')
    `;
    const statusMap = new Map(statusRows.map((s) => [s.Variable_name, s.Value]));

    // 4. Fetch table counts
    const [
      userCount,
      productCount,
      orderCount,
      paymentCount,
      customOrderCount,
      komplainCount,
      chatCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.produk.count(),
      prisma.order.count(),
      prisma.payment.count(),
      prisma.customorder.count(),
      prisma.komplain.count(),
      prisma.chatsupportmessage.count(),
    ]);

    const maxConns = parseInt(varMap.get("max_connections") || "151", 10);
    const threadsConnected = parseInt(statusMap.get("Threads_connected") || "1", 10);
    const threadsRunning = parseInt(statusMap.get("Threads_running") || "1", 10);
    const slowQueries = parseInt(statusMap.get("Slow_queries") || "0", 10);
    const uptimeSec = parseInt(statusMap.get("Uptime") || "0", 10);
    const uptimeHours = (uptimeSec / 3600).toFixed(1);
    const bufferPoolBytes = parseInt(varMap.get("innodb_buffer_pool_size") || "0", 10);
    const bufferPoolMb = (bufferPoolBytes / (1024 * 1024)).toFixed(0);

    const connUsagePct = ((threadsConnected / maxConns) * 100).toFixed(1);

    console.log(`\n[STATUS] Database Engine: MySQL / MariaDB (${varMap.get("version") ?? "Unknown"})`);
    console.log(`[STATUS] Uptime: ${uptimeHours} jam (${uptimeSec} detik)`);
    console.log(`[STATUS] Ping Round-Trip Latency: ${pingMs} ms ${pingMs < 100 ? "✓ (FAST)" : "⚠ (HIGH LATENCY)"}`);

    console.log("\n--- Connection Pool Health ---");
    console.log(`Max Connections Limit : ${maxConns}`);
    console.log(`Active Connected      : ${threadsConnected} (${connUsagePct}% usage)`);
    console.log(`Threads Running       : ${threadsRunning}`);
    console.log(`Wait Timeout          : ${varMap.get("wait_timeout")} detik`);
    console.log(`Slow Queries Detected : ${slowQueries} ${slowQueries === 0 ? "✓ (CLEAN)" : "⚠ (CHECK SLOW QUERY LOG)"}`);
    console.log(`InnoDB Buffer Pool    : ${bufferPoolMb} MB`);

    console.log("\n--- Key Table Volumes ---");
    const tables: TableCount[] = [
      { name: "user", count: userCount },
      { name: "produk", count: productCount },
      { name: "order", count: orderCount },
      { name: "payment", count: paymentCount },
      { name: "customorder", count: customOrderCount },
      { name: "komplain", count: komplainCount },
      { name: "chatsupportmessage", count: chatCount },
    ];

    tables.forEach((t) => {
      console.log(`  • ${t.name.padEnd(20)} : ${t.count.toLocaleString()} baris`);
    });

    console.log("\n--- Production Readiness Assessment ---");
    let isHealthy = true;
    if (threadsConnected > maxConns * 0.8) {
      console.log("  [WARN] Connection usage exceeds 80% of max_connections!");
      isHealthy = false;
    }
    if (pingMs > 250) {
      console.log("  [WARN] High database latency. Verify network region alignment!");
      isHealthy = false;
    }
    if (isHealthy) {
      console.log("  ✓ Database connection, capacity, and settings are HEALTHY.");
    }
    console.log("=======================================================\n");

    process.exit(0);
  } catch (err: unknown) {
    console.error("\n[CRITICAL] Health check gagal:", (err as Error).message || err);
    process.exit(1);
  }
}

runHealthCheck();
