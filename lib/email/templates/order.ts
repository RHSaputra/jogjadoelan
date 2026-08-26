// lib/email/templates/order.ts — Professional Order & Payment Email Templates
// Referensi: Tokopedia, Shopee, Traveloka
import { wrapBaseTemplate } from "./base";
import { formatRupiah } from "@/lib/utils";

function appUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "https://jogjadoelan.com"}${path}`;
}

// ==================== ORDER CREATED ====================
export function orderCreatedTemplate(vars: {
  recipientName: string; orderId: string; total: number; expiredAt: string;
}): { subject: string; html: string } {
  const subject = `Pesanan ${vars.orderId} Berhasil Dibuat — Jogjadoelan`;
  const html = wrapBaseTemplate({
    title: "Pesanan Berhasil Dibuat! 🎉",
    recipientName: vars.recipientName,
    preheader: `Pesanan ${vars.orderId} telah berhasil dibuat. Segera lakukan pembayaran.`,
    orderId: vars.orderId,
    statusBadge: "Menunggu Pembayaran",
    infoRows: [
      { label: "Total Pembayaran", value: `${formatRupiah(vars.total)}`, highlight: true },
      { label: "Batas Pembayaran", value: new Date(vars.expiredAt).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }) },
    ],
    content: `
      <p style="margin: 0 0 8px;">Terima kasih telah berbelanja di Jogjadoelan! Pesanan Anda telah berhasil dibuat.</p>
      <p style="margin: 0 0 0; color: #DC2626; font-size: 14px;">⏰ Segera lakukan pembayaran sebelum batas waktu agar pesanan segera diproses.</p>`,
    ctaUrl: appUrl(`/pembayaran/${vars.orderId}`),
    ctaLabel: "Bayar Sekarang",
  });
  return { subject, html };
}

// ==================== WAITING PAYMENT ====================
export function waitingPaymentTemplate(vars: {
  recipientName: string; orderId: string; total: number; expiredAt: string;
}): { subject: string; html: string } {
  const subject = `Menunggu Pembayaran — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Menunggu Pembayaran",
    recipientName: vars.recipientName,
    preheader: `Pesanan ${vars.orderId} masih menunggu pembayaran.`,
    orderId: vars.orderId,
    statusBadge: "Menunggu Pembayaran",
    infoRows: [
      { label: "Total Pembayaran", value: `${formatRupiah(vars.total)}`, highlight: true },
      { label: "Batas Waktu", value: new Date(vars.expiredAt).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }) },
    ],
    content: `<p style="margin: 0 0 0;">Kami masih menunggu pembayaran untuk pesanan Anda. Silakan segera lakukan pembayaran agar pesanan dapat segera diproses.</p>`,
    ctaUrl: appUrl(`/pembayaran/${vars.orderId}`),
    ctaLabel: "Bayar Sekarang",
  });
  return { subject, html };
}

// ==================== PAYMENT RECEIVED ====================
export function paymentReceivedTemplate(vars: {
  recipientName: string; orderId: string; total: number;
}): { subject: string; html: string } {
  const subject = `Bukti Pembayaran Diterima — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Bukti Pembayaran Diterima ✅",
    recipientName: vars.recipientName,
    preheader: `Bukti pembayaran untuk ${vars.orderId} telah kami terima.`,
    orderId: vars.orderId,
    statusBadge: "Menunggu Verifikasi",
    infoRows: [
      { label: "Nominal", value: `${formatRupiah(vars.total)}`, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 8px;">Bukti pembayaran untuk pesanan Anda telah kami terima.</p>
      <p style="margin: 0 0 0; color: #6B7280; font-size: 14px;">Tim admin kami akan memverifikasi pembayaran dalam 1-2 jam kerja. Status akan diupdate secara otomatis.</p>`,
    ctaUrl: appUrl(`/pesanan/${vars.orderId}`),
    ctaLabel: "Lihat Pesanan",
  });
  return { subject, html };
}

export function dpReceivedTemplate(vars: {
  recipientName: string; orderId: string; total: number;
}): { subject: string; html: string } {
  const subject = `DP Diterima — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "DP Diterima ✅",
    recipientName: vars.recipientName,
    preheader: `DP untuk ${vars.orderId} telah kami terima.`,
    orderId: vars.orderId,
    statusBadge: "Menunggu Verifikasi",
    infoRows: [
      { label: "Nominal DP", value: `${formatRupiah(vars.total)}`, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 8px;">DP untuk pesanan Anda telah kami terima.</p>
      <p style="margin: 0 0 0; color: #6B7280; font-size: 14px;">Tim admin kami akan memverifikasi DP dalam 1-2 jam kerja. Status akan diupdate secara otomatis.</p>`,
    ctaUrl: appUrl(`/pesanan/${vars.orderId}`),
    ctaLabel: "Lihat Pesanan",
  });
  return { subject, html };
}

// ==================== PAYMENT REJECTED ====================
export function paymentRejectedTemplate(vars: {
  recipientName: string; orderId: string; reason: string;
}): { subject: string; html: string } {
  const subject = `Pembayaran Ditolak — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pembayaran Ditolak",
    recipientName: vars.recipientName,
    preheader: `Pembayaran untuk ${vars.orderId} ditolak. Silakan upload ulang.`,
    orderId: vars.orderId,
    statusBadge: "Ditolak",
    content: `
      <p style="margin: 0 0 12px;">Pembayaran untuk pesanan Anda ditolak oleh admin.</p>
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 14px; margin: 12px 0;">
        <p style="margin: 0; color: #991B1B; font-size: 14px;"><strong>Alasan:</strong> ${vars.reason}</p>
      </div>
      <p style="margin: 12px 0 0;">Silakan upload ulang bukti pembayaran yang benar.</p>`,
    ctaUrl: appUrl(`/pembayaran/${vars.orderId}`),
    ctaLabel: "Upload Ulang",
  });
  return { subject, html };
}

// ==================== PAYMENT VERIFIED ====================
export function paymentVerifiedTemplate(vars: {
  recipientName: string; orderId: string;
}): { subject: string; html: string } {
  const subject = `Pembayaran Dikonfirmasi — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pembayaran Dikonfirmasi ✅",
    recipientName: vars.recipientName,
    preheader: `Pembayaran untuk ${vars.orderId} telah diverifikasi.`,
    orderId: vars.orderId,
    statusBadge: "Pembayaran Dikonfirmasi",
    content: `
      <p style="margin: 0 0 8px;">Pembayaran untuk pesanan Anda telah diverifikasi!</p>
      <p style="margin: 0 0 0;">Pesanan Anda sedang diproses dan akan segera dikemas oleh tim kami. Kami akan mengirimkan notifikasi selanjutnya saat pesanan dikirim.</p>`,
    ctaUrl: appUrl(`/pesanan/${vars.orderId}`),
    ctaLabel: "Lihat Pesanan",
  });
  return { subject, html };
}

// ==================== ORDER DIPROSES ====================
export function orderDiprosesTemplate(vars: {
  recipientName: string; orderId: string;
}): { subject: string; html: string } {
  const subject = `Pesanan Diproses — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pesanan Sedang Diproses 🔧",
    recipientName: vars.recipientName,
    preheader: `Pesanan ${vars.orderId} sedang diproses oleh tim kami.`,
    orderId: vars.orderId,
    statusBadge: "Diproses",
    content: `
      <p style="margin: 0 0 8px;">Pesanan Anda sedang diproses oleh tim Jogjadoelan.</p>
      <p style="margin: 0 0 0;">Kami akan segera mengirimkan pesanan Anda setelah selesai dikemas. Pantau terus status pesanan Anda.</p>`,
    ctaUrl: appUrl(`/pesanan/${vars.orderId}`),
    ctaLabel: "Lihat Pesanan",
  });
  return { subject, html };
}

// ==================== ORDER SIAP DIKIRIM ====================
export function orderSiapDikirimTemplate(vars: {
  recipientName: string; orderId: string;
}): { subject: string; html: string } {
  const subject = `Pesanan Siap Dikirim — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pesanan Siap Dikirim 📦",
    recipientName: vars.recipientName,
    preheader: `Pesanan ${vars.orderId} sudah siap dikirim.`,
    orderId: vars.orderId,
    statusBadge: "Siap Dikirim",
    content: `
      <p style="margin: 0 0 8px;">Pesanan Anda sudah selesai dikemas dan siap untuk dikirim.</p>
      <p style="margin: 0 0 0;">Nomor resi akan kami informasikan setelah kurir mengambil paket. Silakan pantau terus email Anda untuk update selanjutnya.</p>`,
    ctaUrl: appUrl(`/pesanan/${vars.orderId}`),
    ctaLabel: "Lihat Pesanan",
  });
  return { subject, html };
}

// ==================== ORDER SHIPPED ====================
export function orderShippedTemplate(vars: {
  recipientName: string; orderId: string; kurir: string; resi: string;
}): { subject: string; html: string } {
  const subject = `Pesanan Dikirim — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pesanan Telah Dikirim 🚚",
    recipientName: vars.recipientName,
    preheader: `Pesanan ${vars.orderId} telah dikirim via ${vars.kurir}.`,
    orderId: vars.orderId,
    statusBadge: "Dikirim",
    infoRows: [
      { label: "Kurir", value: vars.kurir },
      { label: "No. Resi", value: vars.resi, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 8px;">Pesanan Anda telah dikirim! 🎉</p>
      <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 14px; margin: 12px 0;">
        <p style="margin: 0 0 4px; color: #0369A1; font-size: 13px;">📮 <strong>No. Resi:</strong> ${vars.resi}</p>
        <p style="margin: 0; color: #0369A1; font-size: 13px;">🚚 <strong>Kurir:</strong> ${vars.kurir}</p>
      </div>
      <p style="margin: 8px 0 0; color: #6B7280; font-size: 14px;">Paket diperkirakan tiba dalam 1-3 hari kerja. Jangan lupa konfirmasi setelah diterima!</p>`,
    ctaUrl: appUrl(`/pesanan/${vars.orderId}`),
    ctaLabel: "Lacak Pesanan",
  });
  return { subject, html };
}

// ==================== RESI ADDED ====================
export function resiAddedTemplate(vars: {
  recipientName: string; orderId: string; kurir: string; resi: string;
}): { subject: string; html: string } {
  return orderShippedTemplate(vars);
}

// ==================== ORDER COMPLETED ====================
export function orderCompletedTemplate(vars: {
  recipientName: string; orderId: string;
}): { subject: string; html: string } {
  const subject = `Pesanan Selesai — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pesanan Selesai 🎉",
    recipientName: vars.recipientName,
    preheader: `Pesanan ${vars.orderId} telah selesai. Terima kasih!`,
    orderId: vars.orderId,
    statusBadge: "Selesai",
    content: `
      <p style="margin: 0 0 8px;">Pesanan Anda telah selesai! Terima kasih telah berbelanja di <strong>Jogjadoelan</strong>.</p>
      <p style="margin: 0 0 0;">Kami sangat menghargai jika Anda memberikan ulasan untuk produk yang sudah diterima. Masukan Anda membantu kami terus berkembang.</p>`,
    ctaUrl: appUrl(`/ulasan/${vars.orderId}`),
    ctaLabel: "Beri Ulasan",
  });
  return { subject, html };
}

// ==================== ORDER CANCELLED ====================
export function orderCancelledTemplate(vars: {
  recipientName: string; orderId: string; reason?: string;
}): { subject: string; html: string } {
  const subject = `Pesanan Dibatalkan — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pesanan Dibatalkan",
    recipientName: vars.recipientName,
    preheader: `Pesanan ${vars.orderId} telah dibatalkan.`,
    orderId: vars.orderId,
    statusBadge: "Dibatalkan",
    content: `
      <p style="margin: 0 0 8px;">Pesanan Anda telah dibatalkan.</p>
      ${vars.reason ? `<div style="background: #F3F4F6; border-radius: 8px; padding: 12px 14px; margin: 12px 0;"><p style="margin: 0; color: #6B7280; font-size: 14px;"><strong>Alasan:</strong> ${vars.reason}</p></div>` : ""}
      <p style="margin: 12px 0 0;">Jangan khawatir, Anda bisa membuat pesanan baru kapan saja.</p>`,
    ctaUrl: appUrl("/belanja"),
    ctaLabel: "Belanja Lagi",
  });
  return { subject, html };
}

// ==================== ORDER EXPIRED ====================
export function orderExpiredTemplate(vars: {
  recipientName: string; orderId: string;
}): { subject: string; html: string } {
  const subject = `Pesanan Kadaluarsa — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pesanan Kadaluarsa",
    recipientName: vars.recipientName,
    preheader: `Pesanan ${vars.orderId} telah kadaluarsa.`,
    orderId: vars.orderId,
    statusBadge: "Kadaluarsa",
    content: `
      <p style="margin: 0 0 8px;">Pesanan Anda telah kadaluarsa karena melewati batas waktu pembayaran.</p>
      <p style="margin: 0 0 0;">Silakan membuat pesanan baru jika masih berminat dengan produk tersebut.</p>`,
    ctaUrl: appUrl("/belanja"),
    ctaLabel: "Buat Pesanan Baru",
  });
  return { subject, html };
}

// ==================== REFUND REQUESTED ====================
export function orderRefundedTemplate(vars: {
  recipientName: string; orderId: string;
}): { subject: string; html: string } {
  const subject = `Pengembalian Dana Diproses — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pengembalian Dana Diproses",
    recipientName: vars.recipientName,
    preheader: `Permintaan refund untuk ${vars.orderId} sedang diproses.`,
    orderId: vars.orderId,
    statusBadge: "Refund Diproses",
    content: `
      <p style="margin: 0 0 8px;">Permintaan refund untuk pesanan Anda sedang diproses.</p>
      <p style="margin: 0 0 0;">Tim kami akan memproses pengembalian dana sesuai dengan ketentuan yang berlaku. Kami akan menghubungi Anda untuk informasi lebih lanjut.</p>`,
    ctaUrl: appUrl(`/pesanan/${vars.orderId}`),
    ctaLabel: "Lihat Pesanan",
  });
  return { subject, html };
}

// ==================== REFUND COMPLETED ====================
export function refundCompletedTemplate(vars: {
  recipientName: string; orderId: string; nominal: number;
}): { subject: string; html: string } {
  const subject = `Refund Selesai — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pengembalian Dana Selesai ✅",
    recipientName: vars.recipientName,
    preheader: `Refund ${formatRupiah(vars.nominal)} untuk ${vars.orderId} telah selesai.`,
    orderId: vars.orderId,
    statusBadge: "Refund Selesai",
    infoRows: [
      { label: "Nominal Refund", value: `${formatRupiah(vars.nominal)}`, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 8px;">Pengembalian dana sebesar <strong>${formatRupiah(vars.nominal)}</strong> untuk pesanan Anda telah selesai diproses.</p>
      <p style="margin: 0 0; color: #6B7280; font-size: 14px;">Dana akan masuk ke rekening Anda dalam 1-3 hari kerja tergantung kebijakan bank masing-masing.</p>`,
    ctaUrl: appUrl(`/pesanan/${vars.orderId}`),
    ctaLabel: "Lihat Pesanan",
  });
  return { subject, html };
}

// ==================== PAYMENT REMINDER ====================
export function paymentReminderTemplate(vars: {
  recipientName: string; orderId: string; total: number; daysLeft: number; expiredAt: string;
}): { subject: string; html: string } {
  let urgencyText: string;
  let urgencyColor: string;
  if (vars.daysLeft <= 0) { urgencyText = "HARI INI batas terakhir!"; urgencyColor = "#DC2626"; }
  else if (vars.daysLeft === 1) { urgencyText = "Besok batas terakhir!"; urgencyColor = "#DC2626"; }
  else { urgencyText = `Tersisa ${vars.daysLeft} hari lagi`; urgencyColor = "#D97706"; }

  const subject = `⏰ Reminder Pembayaran — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Reminder Pembayaran ⏰",
    recipientName: vars.recipientName,
    preheader: `Jangan lupa! Pembayaran ${vars.orderId} ${urgencyText.toLowerCase()}`,
    orderId: vars.orderId,
    statusBadge: "Belum Dibayar",
    infoRows: [
      { label: "Total", value: `${formatRupiah(vars.total)}`, highlight: true },
      { label: "Batas Akhir", value: new Date(vars.expiredAt).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" }) },
    ],
    content: `
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 14px; margin: 0 0 12px;">
        <p style="margin: 0; color: ${urgencyColor}; font-size: 14px; font-weight: 600;">⏰ <strong>${urgencyText}</strong></p>
      </div>
      <p style="margin: 0 0 0;">Pesanan Anda masih menunggu pembayaran. Segera lakukan pembayaran sebelum batas waktu agar pesanan tidak otomatis dibatalkan.</p>`,
    ctaUrl: appUrl(`/pembayaran/${vars.orderId}`),
    ctaLabel: "Bayar Sekarang",
  });
  return { subject, html };
}

// ==================== PELUNASAN REMINDER ====================
export function pelunasanReminderTemplate(vars: {
  recipientName: string; orderId: string; total: number; sisaAmount: number; daysLeft: number;
}): { subject: string; html: string } {
  const subject = `Reminder Pelunasan — Custom Order ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Reminder Pelunasan",
    recipientName: vars.recipientName,
    preheader: `Custom order ${vars.orderId} sudah siap dilakukan pelunasan.`,
    orderId: vars.orderId,
    statusBadge: "Menunggu Pelunasan",
    infoRows: [
      { label: "Total", value: `${formatRupiah(vars.total)}`, highlight: true },
      { label: "Sisa Pembayaran", value: `${formatRupiah(vars.sisaAmount)}`, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 8px;">Custom order Anda sudah siap dilakukan pelunasan.</p>
      <p style="margin: 0 0 0;">Segera lunasi sisa pembayaran agar helm custom Anda segera dikirimkan.</p>`,
    ctaUrl: appUrl(`/pelunasan/${vars.orderId}`),
    ctaLabel: "Lunasi Sekarang",
  });
  return { subject, html };
}

// ==================== PELUNASAN SUCCESS ====================
export function pelunasanSuccessTemplate(vars: {
  recipientName: string; orderId: string; total: number;
}): { subject: string; html: string } {
  const subject = `Pelunasan Berhasil — Custom Order ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pelunasan Berhasil ✅",
    recipientName: vars.recipientName,
    preheader: `Pelunasan untuk custom order ${vars.orderId} telah berhasil.`,
    orderId: vars.orderId,
    statusBadge: "Lunas",
    infoRows: [
      { label: "Total", value: `${formatRupiah(vars.total)}`, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 8px;">Pelunasan untuk custom order Anda telah berhasil!</p>
      <p style="margin: 0 0 0;">Pesanan Anda akan segera diproses dan dikirim. Kami akan mengirimkan notifikasi selanjutnya.</p>`,
    ctaUrl: appUrl(`/custom/${vars.orderId}`),
    ctaLabel: "Lihat Pesanan",
  });
  return { subject, html };
}

// ==================== KOMPLAIN CREATED ====================
export function komplainCreatedTemplate(vars: {
  recipientName: string;
  komplainId: string;
}): { subject: string; html: string } {
  const subject = `Komplain Diajukan — ${vars.komplainId}`;
  const html = wrapBaseTemplate({
    title: "Komplain Diajukan",
    recipientName: vars.recipientName,
    preheader: `Komplain ${vars.komplainId} telah diajukan dan menunggu tinjauan admin.`,
    komplainId: vars.komplainId,
    statusBadge: "Diajukan",
    content: `
      <p style="margin: 0 0 8px;">Komplain Anda telah kami terima. Admin akan meninjau secepatnya pada jam operasional Senin–Sabtu 08.00–17.00 WIB.</p>
      <p style="margin: 0 0 0;">Selama menunggu, Anda bisa menambahkan informasi atau bukti melalui ruang chat komplain.</p>`,
    ctaUrl: appUrl(`/komplain/${vars.komplainId}`),
    ctaLabel: "Lihat Komplain",
  });
  return { subject, html };
}

// ==================== KOMPLAIN REPLIED ====================
export function komplainRepliedTemplate(vars: {
  recipientName: string;
  komplainId: string;
  adminName?: string;
}): { subject: string; html: string } {
  const subject = `Balasan Komplain — ${vars.komplainId}`;
  const html = wrapBaseTemplate({
    title: "Balasan Komplain",
    recipientName: vars.recipientName,
    preheader: `Admin ${vars.adminName ?? "Admin"} telah membalas komplain Anda.`,
    komplainId: vars.komplainId,
    statusBadge: "Dibalas",
    content: `
      <p style="margin: 0 0 8px;">Komplain Anda telah dibalas oleh admin. Silakan periksa ruang chat untuk detail balasan.</p>
      <p style="margin: 0 0 0;">Jika Anda membutuhkan bantuan lebih lanjut, silakan menghubungi kami melalui halaman kontak.</p>`,
    ctaUrl: appUrl(`/komplain/${vars.komplainId}`),
    ctaLabel: "Lihat Komplain",
  });
  return { subject, html };
}

// ==================== TUKAR REQUESTED ====================
export function tukarRequestedTemplate(vars: {
  recipientName: string;
  komplainId: string;
  orderId: string;
  productNama: string;
  ukuranBaru: string;
}): { subject: string; html: string } {
  const subject = `Pengajuan Tukar Barang Diproses — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Pengajuan Tukar Barang",
    recipientName: vars.recipientName,
    preheader: `Pengajuan tukar barang untuk ${vars.orderId} sedang diproses.`,
    orderId: vars.orderId,
    komplainId: vars.komplainId,
    statusBadge: "Tukar Diproses",
    infoRows: [
      { label: "Produk", value: vars.productNama },
      { label: "Ukuran Baru", value: vars.ukuranBaru, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 8px;">Pengajuan penukaran barang untuk pesanan Anda telah berhasil diajukan dan sedang diproses.</p>
      <p style="margin: 0 0 0;">Tim kami akan memeriksa ketersediaan stok varian pengganti. Kami akan menginfokan status selanjutnya segera.</p>`,
    ctaUrl: appUrl(`/komplain/${vars.komplainId}`),
    ctaLabel: "Lihat Status Komplain",
  });
  return { subject, html };
}

// ==================== TUKAR APPROVED ====================
export function tukarApprovedTemplate(vars: {
  recipientName: string;
  komplainId: string;
  orderId: string;
  kurir: string;
}): { subject: string; html: string } {
  const subject = `Tukar Barang Disetujui — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Penukaran Barang Disetujui ✅",
    recipientName: vars.recipientName,
    preheader: `Pengajuan penukaran barang untuk ${vars.orderId} disetujui.`,
    orderId: vars.orderId,
    komplainId: vars.komplainId,
    statusBadge: "Tukar Disetujui",
    content: `
      <p style="margin: 0 0 8px;">Pengajuan penukaran barang Anda telah disetujui oleh admin.</p>
      <p style="margin: 0 0 8px;">Silakan kirimkan barang lama Anda kembali ke workshop kami via ekspedisi <strong>${vars.kurir}</strong>.</p>
      <p style="margin: 0 0 0; color: #DC2626; font-size: 14px;">⚠️ Setelah mengirimkan barang, harap masukkan nomor resi pengiriman balik pada halaman komplain agar dapat kami lacak.</p>`,
    ctaUrl: appUrl(`/komplain/${vars.komplainId}`),
    ctaLabel: "Input Resi Pengembalian",
  });
  return { subject, html };
}

// ==================== TUKAR REJECTED ====================
export function tukarRejectedTemplate(vars: {
  recipientName: string;
  komplainId: string;
  orderId: string;
  reason: string;
}): { subject: string; html: string } {
  const subject = `Tukar Barang Ditolak — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Penukaran Barang Ditolak ❌",
    recipientName: vars.recipientName,
    preheader: `Pengajuan penukaran barang untuk ${vars.orderId} ditolak.`,
    orderId: vars.orderId,
    komplainId: vars.komplainId,
    statusBadge: "Tukar Ditolak",
    content: `
      <p style="margin: 0 0 12px;">Mohon maaf, pengajuan penukaran barang untuk pesanan Anda belum dapat disetujui.</p>
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 14px; margin: 12px 0;">
        <p style="margin: 0; color: #991B1B; font-size: 14px;"><strong>Alasan Penolakan:</strong> ${vars.reason}</p>
      </div>
      <p style="margin: 12px 0 0;">Silakan periksa detail komplain Anda di aplikasi atau hubungi Customer Service kami untuk bantuan lebih lanjut.</p>`,
    ctaUrl: appUrl(`/komplain/${vars.komplainId}`),
    ctaLabel: "Lihat Detail Komplain",
  });
  return { subject, html };
}

// ==================== TUKAR SHIPPED ====================
export function tukarShippedTemplate(vars: {
  recipientName: string;
  komplainId: string;
  orderId: string;
  kurir: string;
  resi: string;
}): { subject: string; html: string } {
  const subject = `Barang Pengganti Dikirim — ${vars.orderId}`;
  const html = wrapBaseTemplate({
    title: "Barang Pengganti Dikirim 🚚",
    recipientName: vars.recipientName,
    preheader: `Varian pengganti untuk ${vars.orderId} telah dikirim via ${vars.kurir}.`,
    orderId: vars.orderId,
    komplainId: vars.komplainId,
    statusBadge: "Tukar Dikirim",
    infoRows: [
      { label: "Kurir", value: vars.kurir },
      { label: "No. Resi Baru", value: vars.resi, highlight: true },
    ],
    content: `
      <p style="margin: 0 0 8px;">Kabar baik! Barang pengganti untuk penukaran pesanan Anda telah dikirim via <strong>${vars.kurir}</strong>.</p>
      <div style="background: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 8px; padding: 14px; margin: 12px 0;">
        <p style="margin: 0 0 4px; color: #0369A1; font-size: 13px;">📮 <strong>No. Resi:</strong> ${vars.resi}</p>
        <p style="margin: 0; color: #0369A1; font-size: 13px;">🚚 <strong>Kurir:</strong> ${vars.kurir}</p>
      </div>
      <p style="margin: 8px 0 0; color: #6B7280; font-size: 14px;">Mohon konfirmasi penerimaan setelah paket sampai di tujuan.</p>`,
    ctaUrl: appUrl(`/komplain/${vars.komplainId}`),
    ctaLabel: "Lacak Pengiriman",
  });
  return { subject, html };
}