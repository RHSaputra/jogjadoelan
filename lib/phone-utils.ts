/**
 * Phone number validation and normalization utilities.
 */

// Regex for valid phone number: Must start with 08, only digits, 10-13 length.
export const RX_NOHP = /^08\d{8,11}$/;

/**
 * Validates if a phone number strictly matches the 08... format (10-13 digits)
 */
export function isValidNoHp(raw: string): boolean {
  return RX_NOHP.test(raw);
}

/**
 * Normalizes any valid-ish phone number (e.g. +628..., 628..., 08...) into standard 08... format.
 * This is used to sanitize input before saving to database.
 */
export function normalizeNoHp(raw: string): string {
  const cleaned = raw.replace(/\D/g, "");
  if (cleaned.startsWith("62")) {
    return "0" + cleaned.slice(2);
  }
  if (cleaned.startsWith("8")) {
    return "0" + cleaned;
  }
  return cleaned || "";
}

/**
 * Converts a standard 08... phone number into 628... format specifically for WhatsApp API integration.
 */
export function toWhatsappFormat(raw: string): string {
  const cleaned = raw.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    return "62" + cleaned.slice(1);
  }
  if (cleaned.startsWith("8")) {
    return "62" + cleaned;
  }
  return cleaned || "";
}
