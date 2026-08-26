import type { ulasan as PrismaUlasan, user as User, produk as Produk } from "@prisma/client";

export interface UlasanFoto { url: string; type: "image"; name?: string; }

export interface UlasanDTO {
  id: string;
  userId: string;
  userName: string;
  produkId: string;
  produkNama?: string;
  produkGambar?: string;
  orderId: string;
  orderItemId: string;
  rating: number;
  komentar: string;
  foto: UlasanFoto[];
  isHidden: boolean;
  hiddenReason?: string | null;
  balasan?: string | null;
  balasanAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

type Full = PrismaUlasan & {
  user?: Pick<User, "id" | "username" | "email"> | null;
  produk?: Pick<Produk, "id" | "nama" | "gambarUtama"> | null;
};

export function mapUlasanToDTO(u: Full): UlasanDTO {
  const username =
    u.user?.username ??
    (u.user?.email ? u.user.email.split("@")[0] : undefined) ??
    `User-${u.userId.slice(0, 4)}`;

  return {
    id: u.id,
    userId: u.userId,
    userName: username,
    produkId: u.produkId,
    produkNama: u.produk?.nama,
    produkGambar: u.produk?.gambarUtama ?? undefined,
    orderId: u.orderId,
    orderItemId: u.orderItemId,
    rating: u.rating,
    komentar: u.komentar,
    foto: Array.isArray(u.fotoPaths) ? (u.fotoPaths as unknown as UlasanFoto[]) : [],
    isHidden: u.isHidden,
    hiddenReason: u.hiddenReason,
    balasan: u.balasan,
    balasanAt: u.balasanAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  };
}
