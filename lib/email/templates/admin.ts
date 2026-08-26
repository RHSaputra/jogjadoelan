// lib/email/templates/admin.ts — Professional Admin Notification Email Templates
import { wrapBaseTemplate } from "./base";
import { formatRupiah } from "@/lib/utils";

function adminUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "https://jogjadoelan.com"}/admin${path}`;
}

/**
 * Notifikasi pesanan baru ke admin — tampilkan info lengkap
 */
export function adminNewOrderTemplate(vars: {
  adminName: string; orderId: string; total: number; customerName: string;
}): { subject: string; html: string } {
  const subject = `[ADMIN] Pesanan Baru ${vars.orderId} — ${formatRupiah(vars.total)}`;
  const html = wrapBaseTemplate({
    title: "🆕 Pesanan Baru Masuk!",
    recipientName: vars.adminName,
    preheader: `Pesanan ${vars.orderId} dari ${vars.customerName} — ${formatRupiah(vars.total)}`,
    orderId: vars.orderId,
    statusBadge: "Baru",
    infoRows: [
      { label: "Customer", value: vars.customerName, highlight: true },
      { label: "Total Pesanan", value: `${formatRupiah(vars.total)}`, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 0;">Ada pesanan baru yang perlu segera diproses. Segera cek detail pesanan dan lakukan konfirmasi.</p>`,
    ctaUrl: adminUrl(`/penjualan/${vars.orderId}`),
    ctaLabel: "Lihat Pesanan",
  });
  return { subject, html };
}

/**
 * Notifikasi pembayaran baru ke admin
 */
export function adminNewPaymentTemplate(vars: {
  adminName: string; orderId: string; total: number; customerName: string;
}): { subject: string; html: string } {
  const subject = `[ADMIN] Pembayaran Masuk — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "💳 Pembayaran Baru Masuk",
    recipientName: vars.adminName,
    preheader: `${vars.customerName} telah mengunggah bukti pembayaran untuk ${vars.orderId}`,
    orderId: vars.orderId,
    statusBadge: "Menunggu Verifikasi",
    infoRows: [
      { label: "Customer", value: vars.customerName },
      { label: "Nominal", value: `${formatRupiah(vars.total)}`, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 8px;">Pelanggan <strong>${vars.customerName}</strong> telah mengunggah bukti pembayaran.</p>
      <p style="margin: 0 0 0; color: #DC2626; font-size: 14px;">⏰ Segera lakukan verifikasi pembayaran agar pesanan bisa segera diproses.</p>`,
    ctaUrl: adminUrl("/validasi-bukti"),
    ctaLabel: "Verifikasi Sekarang",
  });
  return { subject, html };
}

/**
 * Notifikasi bukti pembayaran baru (alias untuk new payment)
 */
export function adminBuktiPembayaranTemplate(vars: {
  adminName: string; orderId: string; total: number;
}): { subject: string; html: string } {
  return adminNewPaymentTemplate({ ...vars, customerName: "Pelanggan" });
}

/**
 * Notifikasi permintaan pembatalan ke admin
 */
export function adminCancelRequestTemplate(vars: {
  adminName: string; orderId: string; reason: string;
}): { subject: string; html: string } {
  const subject = `[ADMIN] Permintaan Pembatalan — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "⛔ Permintaan Pembatalan",
    recipientName: vars.adminName,
    preheader: `Pelanggan mengajukan pembatalan untuk ${vars.orderId}`,
    orderId: vars.orderId,
    statusBadge: "Pembatalan",
    content: `
      <p style="margin: 0 0 8px;">Pelanggan mengajukan pembatalan untuk pesanan <strong>${vars.orderId}</strong>.</p>
      <div style="background: #F3F4F6; border-radius: 8px; padding: 12px 14px; margin: 12px 0;">
        <p style="margin: 0; color: #6B7280; font-size: 14px;"><strong>Alasan:</strong> ${vars.reason}</p>
      </div>
      <p style="margin: 12px 0 0;">Segera tinjau dan proses permintaan pembatalan ini.</p>`,
    ctaUrl: adminUrl(`/penjualan/${vars.orderId}`),
    ctaLabel: "Lihat Pesanan",
  });
  return { subject, html };
}

/**
 * Notifikasi refund ke admin
 */
export function adminRefundRequestTemplate(vars: {
  adminName: string; refundId: string; orderId: string; nominal: number;
}): { subject: string; html: string } {
  const subject = `[ADMIN] Permintaan Refund — ${vars.refundId}`;
  const html = wrapBaseTemplate({
    title: "🔄 Permintaan Refund Baru",
    recipientName: vars.adminName,
    preheader: `Refund ${vars.refundId} untuk pesanan ${vars.orderId}`,
    orderId: vars.orderId,
    statusBadge: "Refund",
    infoRows: [
      { label: "Refund ID", value: vars.refundId },
      { label: "Nominal", value: `${formatRupiah(vars.nominal)}`, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 0;">Permintaan refund baru untuk pesanan <strong>${vars.orderId}</strong>. Segera proses refund ini sesuai dengan ketentuan yang berlaku.</p>`,
    ctaUrl: adminUrl(`/refund/${vars.refundId}`),
    ctaLabel: "Proses Refund",
  });
  return { subject, html };
}

/**
 * Notifikasi stok kritis ke admin
 */
export function adminLowStockTemplate(vars: {
  adminName: string; products: Array<{ nama: string; stok: number; sku?: string }>;
}): { subject: string; html: string } {
  const list = vars.products.map(p =>
    `<tr><td style="padding: 8px 0; color: #374151; font-size: 14px; border-bottom: 1px solid #F3F4F6;">${p.nama}${p.sku ? ` <span style="color: #9CA3AF; font-size: 12px;">(${p.sku})</span>` : ""}</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 700; color: #DC2626; border-bottom: 1px solid #F3F4F6;">${p.stok} pcs</td></tr>`
  ).join("");
  const subject = `[ADMIN] Stok Kritis — ${vars.products.length} produk`;
  const html = wrapBaseTemplate({
    title: "⚠️ Peringatan Stok Kritis",
    recipientName: vars.adminName,
    preheader: `${vars.products.length} produk memiliki stok di bawah batas minimum`,
    content: `
      <p style="margin: 0 0 8px;">Produk berikut memiliki stok di bawah batas minimum dan perlu segera di-restock:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <tr><th style="padding: 8px 0; text-align: left; color: #6B7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #E5E7EB;">Produk</th><th style="padding: 8px 0; text-align: right; color: #6B7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #E5E7EB;">Stok</th></tr>
        ${list}
      </table>
      <p style="margin: 8px 0 0; color: #DC2626; font-size: 14px;">Segera lakukan restock untuk menghindari kehabisan stok.</p>`,
    ctaUrl: adminUrl("/produk"),
    ctaLabel: "Kelola Produk",
  });
  return { subject, html };
}

/**
 * Notifikasi stok habis ke admin
 */
export function adminOutOfStockTemplate(vars: {
  adminName: string; products: Array<{ nama: string; sku?: string }>;
}): { subject: string; html: string } {
  const list = vars.products.map(p =>
    `<tr><td style="padding: 8px 0; color: #374151; font-size: 14px; border-bottom: 1px solid #F3F4F6;">${p.nama}${p.sku ? ` <span style="color: #9CA3AF; font-size: 12px;">(${p.sku})</span>` : ""}</td><td style="padding: 8px 0; text-align: right; font-size: 14px; font-weight: 700; color: #DC2626; border-bottom: 1px solid #F3F4F6;">HABIS</td></tr>`
  ).join("");
  const subject = `[ADMIN] Stok Habis — ${vars.products.length} produk`;
  const html = wrapBaseTemplate({
    title: "🚨 Produk Habis!",
    recipientName: vars.adminName,
    preheader: `${vars.products.length} produk kehabisan stok`,
    content: `
      <p style="margin: 0 0 8px;">Produk berikut kehabisan stok dan tidak dapat dibeli oleh pelanggan:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <tr><th style="padding: 8px 0; text-align: left; color: #6B7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #E5E7EB;">Produk</th><th style="padding: 8px 0; text-align: right; color: #6B7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #E5E7EB;">Status</th></tr>
        ${list}
      </table>
      <p style="margin: 8px 0 0; color: #DC2626; font-size: 14px;">Segera isi ulang stok agar pelanggan dapat kembali membeli produk ini.</p>`,
    ctaUrl: adminUrl("/produk"),
    ctaLabel: "Kelola Produk",
  });
  return { subject, html };
}

// ==================== SYSTEM ERROR ====================
export function adminSystemErrorTemplate(vars: {
  adminName: string; errorMessage: string; context?: string;
}): { subject: string; html: string } {
  const subject = `[ADMIN] System Error — Jogjadoelan`;
  const html = wrapBaseTemplate({
    title: "🚨 System Error Terdeteksi",
    recipientName: vars.adminName,
    preheader: "Terjadi error pada sistem Jogjadoelan yang memerlukan perhatian segera",
    statusBadge: "Error",
    content: `
      <p style="margin: 0 0 8px;">Terjadi error pada sistem yang memerlukan perhatian segera:</p>
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 14px; margin: 12px 0; overflow-x: auto;">
        <pre style="margin: 0; font-family: 'Courier New', monospace; font-size: 12px; color: #991B1B; white-space: pre-wrap;">${vars.errorMessage}</pre>
      </div>
      ${vars.context ? `<div style="background: #F3F4F6; border-radius: 8px; padding: 12px 14px; margin: 12px 0;"><p style="margin: 0; color: #6B7280; font-size: 13px;"><strong>Context:</strong> ${vars.context}</p></div>` : ""}
      <p style="margin: 12px 0 0; color: #DC2626; font-size: 14px;">Segera periksa server logs untuk detail lebih lanjut dan lakukan tindakan yang diperlukan.</p>`,
    ctaUrl: adminUrl("/"),
    ctaLabel: "Ke Dashboard",
  });
  return { subject, html };
}

// ==================== NEW KOMPLAIN ====================
export function adminNewKomplainTemplate(vars: {
  adminName: string;
  komplainId: string;
  customerName: string;
  jenisLabel: string;
}): { subject: string; html: string } {
  const subject = `[ADMIN] Komplain Baru Diajukan — ${vars.komplainId}`;
  const html = wrapBaseTemplate({
    title: "⚠️ Laporan Komplain Baru",
    recipientName: vars.adminName,
    preheader: `Customer ${vars.customerName} mengajukan komplain baru: ${vars.jenisLabel}`,
    komplainId: vars.komplainId,
    statusBadge: "Komplain Baru",
    infoRows: [
      { label: "Customer", value: vars.customerName },
      { label: "Kategori Komplain", value: vars.jenisLabel, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 8px;">Customer <strong>${vars.customerName}</strong> baru saja mengajukan komplain baru di toko.</p>
      <p style="margin: 0 0 0; color: #DC2626; font-size: 14px;">⏰ Segera lakukan pengecekan detail komplain dan tanggapi di ruang chat komplain admin.</p>`,
    ctaUrl: adminUrl(`/komplain/${vars.komplainId}`),
    ctaLabel: "Tinjau Komplain",
  });
  return { subject, html };
}

// ==================== NEW TUKAR BARANG ====================
export function adminNewTukarTemplate(vars: {
  adminName: string;
  tukarId: string;
  customerName: string;
  orderId: string;
  productNama: string;
  ukuranBaru: string;
}): { subject: string; html: string } {
  const subject = `[ADMIN] Permintaan Tukar Barang Baru — ${vars.tukarId}`;
  const html = wrapBaseTemplate({
    title: "🔄 Permintaan Tukar Barang Baru",
    recipientName: vars.adminName,
    preheader: `Permintaan tukar barang ${vars.tukarId} untuk pesanan ${vars.orderId}`,
    orderId: vars.orderId,
    statusBadge: "Tukar Baru",
    infoRows: [
      { label: "Customer", value: vars.customerName },
      { label: "Produk", value: vars.productNama },
      { label: "Ukuran Baru", value: vars.ukuranBaru, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 8px;">Customer <strong>${vars.customerName}</strong> mengajukan penukaran barang untuk pesanan <strong>${vars.orderId}</strong>.</p>
      <p style="margin: 0 0 0;">Segera periksa ketersediaan stok varian baru dan proses pengajuan penukaran ini.</p>`,
    ctaUrl: adminUrl(`/tukar/${vars.tukarId}`), // Link ke halaman detail tukar admin
    ctaLabel: "Proses Penukaran",
  });
  return { subject, html };
}