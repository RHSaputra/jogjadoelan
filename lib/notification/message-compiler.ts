import { normalizeNoHp } from "@/lib/phone-utils";

export interface BroadcastRecipient {
  nama: string;
  noHp?: string | null;
  email?: string | null;
  userId?: string | null;
}

export function compileMessage(template: string, recipient: BroadcastRecipient): string {
  const targetPhone = normalizeNoHp(recipient.noHp || "");
  const vars: Record<string, string> = {
    nama: recipient.nama,
    nomor: targetPhone,
    email: recipient.email || "",
  };

  let message = template;
  for (const [key, value] of Object.entries(vars)) {
    message = message.replace(new RegExp(`\\{${key}\\}`, "gi"), value || "");
  }
  return message;
}
