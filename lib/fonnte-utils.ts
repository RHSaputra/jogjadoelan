/**
 * Validates whether a URL can be used as Fonnte media attachment.
 * Fonnte requires publicly accessible HTTPS URLs — localhost/private IPs fail.
 */
export function isPublicMediaUrl(url?: string | null): boolean {
  if (!url || !url.trim()) return false;

  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.") ||
      host.endsWith(".local")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Returns a safe image URL for Fonnte, or undefined if not public.
 */
export function resolveFonnteImageUrl(url?: string | null): string | undefined {
  return isPublicMediaUrl(url) ? url!.trim() : undefined;
}
