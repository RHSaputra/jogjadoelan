// Test Biteship API
const API_KEY = "biteship_live.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiam9namFkb2VsYW4iLCJ1c2VySWQiOiI2YTFkNjkyZGE2ZTMzNTU4MWZlM2QyN2MiLCJpYXQiOjE3ODAzMTI1ODV9.qOxGfbB-A5GdHp4G6xU7IKcjVCRf7xxvHJvr7B7Lfa4";
const BASE = "https://api.biteship.com/v1";

async function test() {
  console.log("=== TEST BITESHIP ===\n");

  // Area search
  console.log("1. Area search (yogya):");
  const a = await fetch(`${BASE}/maps/areas?countries=ID&input=yogya&type=single`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  const aj = await a.json();
  console.log(`   Status: ${a.status} | success: ${aj?.success} | areas: ${aj?.areas?.length ?? 0}`);
  if (aj?.areas?.length > 0) console.log(`   Sample: ${aj.areas[0].name} (${aj.areas[0].postal_code})`);

  // Rates
  console.log("\n2. Rates (Yogya→Jakarta Pusat):");
  const r = await fetch(`${BASE}/rates/couriers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      origin_postal_code: "55782",
      destination_postal_code: "10110",
      couriers: "jne,jnt,pos",
      items: [{ name: "Helm", weight: 1000, quantity: 1, value: 100000 }],
    }),
    signal: AbortSignal.timeout(15000),
  });
  const rj = await r.json();
  console.log(`   Status: ${r.status} | success: ${rj?.success} | error: ${rj?.error ?? "-"}`);
  const pricing = rj?.pricing ?? [];
  console.log(`   Rates: ${pricing.length}`);
  for (const p of pricing.slice(0, 5)) {
    console.log(`   - ${p.courier_name} ${p.courier_service_name}: Rp ${p.price} (${p.duration})`);
  }
  console.log("\n=== DONE ===");
}
test().catch(e => console.error("ERROR:", e.message ?? e));