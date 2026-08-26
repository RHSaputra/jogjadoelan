"use client";

// Tidak ada lagi localStorage — semua call ke DB via API.
// userId tetap diterima sebagai parameter untuk backward compat,
// tapi server-side menggunakan session (credentials: "include").

const USAGE_API = "/api/voucher-usage";

/** Cek apakah voucher sudah pernah dipakai oleh user ini (untuk 1x-per-user voucher). */
export async function isVoucherUsedByUser(
  _userId: string,
  voucherId: string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `${USAGE_API}?voucherId=${encodeURIComponent(voucherId)}`,
      { credentials: "include" },
    );
    if (!res.ok) return false;
    const json = await res.json() as { data: { used: boolean } };
    return json.data.used;
  } catch {
    return false;
  }
}

/** Berapa kali user ini sudah pakai voucher tertentu. */
export async function getVoucherUsageCount(
  _userId: string,
  voucherId: string,
): Promise<number> {
  try {
    const res = await fetch(
      `${USAGE_API}?voucherId=${encodeURIComponent(voucherId)}`,
      { credentials: "include" },
    );
    if (!res.ok) return 0;
    const json = await res.json() as { data: { count: number } };
    return json.data.count;
  } catch {
    return 0;
  }
}

/** Catat 1x pemakaian voucher oleh user ini. Dipanggil saat checkout sukses. */
export async function markVoucherUsed(
  _userId: string,
  voucherId: string,
  orderId?: string,
): Promise<void> {
  try {
    await fetch(USAGE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ voucherId, orderId }),
    });
  } catch {}
}

/** Reset pemakaian voucher (misal saat cancel order). */
export async function unmarkVoucherUsed(
  _userId: string,
  voucherId: string,
): Promise<void> {
  try {
    await fetch(`${USAGE_API}/${encodeURIComponent(voucherId)}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch {}
}
