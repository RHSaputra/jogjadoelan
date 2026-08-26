// admin-broadcast-helpers.ts — MIGRATED: localStorage → DB via /api/admin/broadcast
// Semua fungsi sekarang async (memanggil API server-side).

export interface Broadcast {
  id: string;
  judul: string;
  pesan: string;
  channel: "wa" | "email" | "notif";
  target: string; // "semua" | "aktif"
  sentAt: string;
}

const BASE = "/api/admin/broadcast";

export async function getBroadcasts(): Promise<Broadcast[]> {
  try {
    const res = await fetch(BASE);
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: Broadcast[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function addBroadcast(
  b: Omit<Broadcast, "id" | "sentAt">,
): Promise<Broadcast | null> {
  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    });
    const json = (await res.json()) as { data?: Broadcast };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function deleteBroadcast(id: string): Promise<void> {
  try {
    await fetch(`${BASE}/${id}`, { method: "DELETE" });
  } catch {
    /* abaikan */
  }
}
