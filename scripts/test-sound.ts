import pusher from "../lib/pusher-server";

async function main() {
  console.log("Mencoba mengirim notifikasi sistem (suara ding)...");
  await pusher.trigger("admin-notifications", "notify", {
    variant: "info",
    title: "Test Sistem Notifikasi",
    message: "Ini adalah tes suara notifikasi sistem standar.",
    syncChannel: "order"
  });
  
  console.log("Menunggu 3 detik...");
  await new Promise((r) => setTimeout(r, 3000));
  
  console.log("Mencoba mengirim notifikasi chat (suara WhatsApp)...");
  await pusher.trigger("admin-notifications", "notify", {
    variant: "success",
    title: "Test Suara Chat",
    message: "Ini adalah tes suara pesan chat baru seperti WhatsApp.",
    syncChannel: "chat"
  });
  
  console.log("Selesai!");
}

main().catch(console.error);
