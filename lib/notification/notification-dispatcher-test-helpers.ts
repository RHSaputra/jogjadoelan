/** Test helpers exported separately to avoid importing prisma in unit tests */
export const DEFAULT_SETTINGS = {
  registrasi: { email: true, whatsapp: true },
  otp: { email: true, whatsapp: true },
  "order-created": { email: true, whatsapp: true },
  "payment-success": { email: true, whatsapp: true },
  "order-processing": { email: true, whatsapp: true },
  "order-shipped": { email: true, whatsapp: true },
  "order-completed": { email: true, whatsapp: true },
  "forgot-password": { email: true, whatsapp: true },
};
