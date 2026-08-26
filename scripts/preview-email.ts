// scripts/preview-email.ts — Generate preview HTML untuk verifikasi desain
// Run: npx tsx scripts/preview-email.ts
import * as fs from "node:fs";
import * as path from "node:path";
import { welcomeEmailTemplate } from "../lib/email/templates/auth";
import { orderCreatedTemplate, orderShippedTemplate, paymentReminderTemplate, tukarRequestedTemplate, tukarShippedTemplate } from "../lib/email/templates/order";
import { adminNewOrderTemplate, adminLowStockTemplate, adminNewKomplainTemplate, adminNewTukarTemplate } from "../lib/email/templates/admin";

const PREVIEW_DIR = path.join(process.cwd(), "email-previews");
fs.mkdirSync(PREVIEW_DIR, { recursive: true});

const samples: Array<{name: string; html: string; subject: string}> = [
  {
    name: "01-welcome",
    subject: "Selamat Datang di Jogjadoelan! 🎉",
    html: welcomeEmailTemplate({recipientName: "Budi Santoso"}).html,
  },
  {
    name: "02-order-created",
    subject: "Pesanan JD-20260102001 Berhasil Dibuat",
    html: orderCreatedTemplate({
      recipientName: "Budi Santoso",
      orderId: "JD-20260102001",
      total: 450000,
      expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }).html,
  },
  {
    name: "03-order-shipped",
    subject: "Pesanan Dikirim — JD-20260102001",
    html: orderShippedTemplate({
      recipientName: "Budi Santoso",
      orderId: "JD-20260102001",
      kurir: "JNE REG",
      resi: "JP1234567890",
    }).html,
  },
  {
    name: "04-payment-reminder",
    subject: "⏰ Reminder Pembayaran — JD-20260102001",
    html: paymentReminderTemplate({
      recipientName: "Budi Santoso",
      orderId: "JD-20260102001",
      total: 450000,
      daysLeft: 0,
      expiredAt: new Date().toISOString(),
    }).html,
  },
  {
    name: "05-admin-new-order",
    subject: "[ADMIN] Pesanan Baru JD-20260102001",
    html: adminNewOrderTemplate({
      adminName: "Admin",
      orderId: "JD-20260102001",
      total: 450000,
      customerName: "Budi Santoso",
    }).html,
  },
  {
    name: "06-admin-low-stock",
    subject: "[ADMIN] Stok Kritis — 3 produk",
    html: adminLowStockTemplate({
      adminName: "Admin",
      products: [
        {nama: "Helmet Retro Black Doff", stok: 3, sku: "HR-BL-001"},
        {nama: "HelmetRetro Cream Vintage", stok: 5, sku: "HR-CR-002"},
        {nama: "HelmetRetro Brown-Classic", stok: 2, sku: "HR-BR-003"},
      ],
    }).html,
  },
  {
    name: "07-tukar-requested",
    subject: "Pengajuan Tukar Barang Diproses — JD-20260102001",
    html: tukarRequestedTemplate({
      recipientName: "Budi Santoso",
      komplainId: "KMP-20260102-XYZ",
      orderId: "JD-20260102001",
      productNama: "Helmet Retro Black Doff",
      ukuranBaru: "L",
    }).html,
  },
  {
    name: "08-tukar-shipped",
    subject: "Barang Pengganti Dikirim — JD-20260102001",
    html: tukarShippedTemplate({
      recipientName: "Budi Santoso",
      komplainId: "KMP-20260102-XYZ",
      orderId: "JD-20260102001",
      kurir: "JNE REG",
      resi: "JP9876543210",
    }).html,
  },
  {
    name: "09-admin-new-komplain",
    subject: "[ADMIN] Komplain Baru Diajukan — KMP-20260102-XYZ",
    html: adminNewKomplainTemplate({
      adminName: "Admin",
      komplainId: "KMP-20260102-XYZ",
      customerName: "Budi Santoso",
      jenisLabel: "Ukuran Helm Tidak Sesuai",
    }).html,
  },
  {
    name: "10-admin-new-tukar",
    subject: "[ADMIN] Permintaan Tukar Barang Baru — TKR-20260102-ABC",
    html: adminNewTukarTemplate({
      adminName: "Admin",
      tukarId: "TKR-20260102-ABC",
      customerName: "Budi Santoso",
      orderId: "JD-20260102001",
      productNama: "Helmet Retro Black Doff",
      ukuranBaru: "L",
    }).html,
  },
];

const indexHtml = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Email Previews — Ready Stok</title>
<style>
  body { margin: 0; padding: 24px; background: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  h1 { color: #111827; text-align: center; margin-bottom: 8px; }
  .subtitle { color: #6B7280; text-align: center; margin-bottom: 32px; font-size: 14px; }
  .grid { max-width: 1400px; margin: 0 auto; }
  .card { background: #FFFFFF; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 32px; overflow: hidden; }
  .card-header { background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: #FFFFFF; padding: 16px 20px; font-weight: 700; }
  .card-subject { font-size: 12px; opacity: 0.85; font-weight: 400; margin-top: 4px; }
  .preview-wrap { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; padding: 16px; background: #F3F4F6; }
  .preview-box { background: #FFFFFF; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); padding: 12px; }
  .preview-label { font-size: 11px; font-weight: 600; color: #6B7280; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }
  .preview-label.desktop { color: #3B82F6; }
  .preview-label.mobile { color: #F97316; }
  iframe { width: 100%; border: 0; background: #FFFFFF; }
  iframe.desktop { height: 700px; }
  iframe.mobile { height: 700px; max-width: 375px; margin: 0 auto; }
</style>
</head>
<body>
<h1>📧 Email Template Previews — Jogjadoelan</h1>
<p class="subtitle">Klik kanan iframe → Open in new tab untuk lihat detail lebih besar</p>
<div class="grid">
${samples.map((s, i) => `
  <div class="card">
    <div class="card-header">
      #${String(i+1).padStart(2,'0')} — ${s.name}
      <div class="card-subject">${s.subject}</div>
    </div>
    <div class="preview-wrap">
      <div class="preview-box">
        <div class="preview-label desktop">💻 Desktop (600px)</div>
        <iframe class="desktop" srcdoc='${s.html.replace(/'/g, "&#39;")}'></iframe>
      </div>
      <div class="preview-box">
        <div class="preview-label mobile">📱 Mobile (375px)</div>
        <iframe class="mobile" srcdoc='${s.html.replace(/'/g, "&#39;")}'></iframe>
      </div>
    </div>
  </div>
`).join("")}
</div>
</body>
</html>`;

fs.writeFileSync(path.join(PREVIEW_DIR, "index.html"), indexHtml);

for (const s of samples) {
  fs.writeFileSync(path.join(PREVIEW_DIR, `${s.name}.html`), s.html);
  console.log(`✅ Generated: ${s.name} — ${s.subject}`);
}

console.log(`\n🎉 Done! Buka: ${path.join(PREVIEW_DIR, "index.html")}`);