// Konversi enum string DB (UPPER_SNAKE) ↔ UI (lower_snake)
export const toUpperEnum = <T extends string>(s: T): string => s.toUpperCase();
export const toLowerEnum = (s: string | null | undefined): string =>
  (s ?? "").toLowerCase();

export const fromUserRole = (s: string): "user" | "admin" | "system" => {
  const x = s.toLowerCase();
  return x === "admin" ? "admin" : x === "system" ? "system" : "user";
};
export const toUserRole = (s: "user" | "admin" | "system"): "USER" | "ADMIN" | "SYSTEM" =>
  s.toUpperCase() as "USER" | "ADMIN" | "SYSTEM";