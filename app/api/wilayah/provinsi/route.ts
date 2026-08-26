import { ok, handler } from "@/lib/api/response";
import { getProvinsi } from "@/lib/wilayah-id";

export const GET = handler(async () => {
  const data = await getProvinsi();
  return ok(data);
});